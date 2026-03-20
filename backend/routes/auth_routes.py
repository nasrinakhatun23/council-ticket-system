from typing import Generator
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import SessionLocal
import hashlib
import models
import schemas
from auth import (
	oauth,
	REDIRECT_URI,
	is_google_configured,
	FRONTEND_AUTH_SUCCESS_URL,
	FRONTEND_AUTH_ERROR_URL,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_db() -> Generator[Session, None, None]:
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def hash_password(password: str) -> str:
	return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/signup")
async def signup(
	payload: schemas.SignupRequest,
	request: Request,
	db: Session = Depends(get_db),
):
	existing_user = db.query(models.User).filter(models.User.email == payload.email.strip().lower()).first()
	if existing_user:
		raise HTTPException(status_code=400, detail="Email already registered")

	user = models.User(
		name=payload.name.strip(),
		email=payload.email.strip().lower(),
		password_hash=hash_password(payload.password),
	)
	db.add(user)
	db.commit()
	db.refresh(user)
	request.session.pop("user", None)
	return {
		"message": "Signup successful",
		"user": {"id": user.id, "name": user.name, "email": user.email},
	}


@router.post("/login")
async def login(
	payload: schemas.LoginRequest,
	request: Request,
	db: Session = Depends(get_db),
):
	user = db.query(models.User).filter(models.User.email == payload.email.strip().lower()).first()
	if not user:
		raise HTTPException(status_code=401, detail="Invalid email or password")

	if user.password_hash != hash_password(payload.password):
		raise HTTPException(status_code=401, detail="Invalid email or password")

	session_user = {
		"id": user.id,
		"email": user.email,
		"name": user.name,
	}
	request.session["user"] = session_user
	return {"message": "Login successful", "user": session_user}


@router.get("/google/login")
async def google_login(request: Request):
	if not is_google_configured():
		raise HTTPException(
			status_code=500,
			detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
		)

	google = oauth.create_client("google")
	if google is None:
		raise HTTPException(status_code=500, detail="Google OAuth client is not available")

	return await google.authorize_redirect(request, REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request):
	google = oauth.create_client("google")
	if google is None:
		raise HTTPException(status_code=500, detail="Google OAuth client is not available")

	try:
		token = await google.authorize_access_token(request)
		user_info = token.get("userinfo")
		if not user_info:
			user_info = await google.parse_id_token(request, token)

		if not user_info:
			raise HTTPException(status_code=400, detail="Unable to fetch user profile from Google")

		user = {
			"id": user_info.get("sub"),
			"email": user_info.get("email"),
			"name": user_info.get("name"),
			"picture": user_info.get("picture"),
		}
		request.session["user"] = user
		return RedirectResponse(url=FRONTEND_AUTH_SUCCESS_URL, status_code=302)
	except Exception:
		request.session.pop("user", None)
		return RedirectResponse(url=FRONTEND_AUTH_ERROR_URL, status_code=302)


@router.get("/me")
async def get_current_user(request: Request):
	user = request.session.get("user")
	if not user:
		raise HTTPException(status_code=401, detail="Not logged in")
	return user


@router.post("/logout")
async def logout(request: Request):
	request.session.pop("user", None)
	return {"message": "Logged out"}
