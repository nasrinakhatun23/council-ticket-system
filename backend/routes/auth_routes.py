import os
from typing import Generator
from urllib.parse import quote_plus
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
	ADMIN_EMAIL,
)

router = APIRouter(prefix="/auth", tags=["auth"])
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()


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

	is_admin = 1 if payload.email.strip().lower() == ADMIN_EMAIL else 0

	user = models.User(
		name=payload.name.strip(),
		email=payload.email.strip().lower(),
		password_hash=hash_password(payload.password),
		is_admin=is_admin,
	)
	db.add(user)
	db.commit()
	db.refresh(user)
	request.session.pop("user", None)
	return {
		"message": "Signup successful",
		"user": {"id": user.id, "name": user.name, "email": user.email, "is_admin": bool(user.is_admin)},
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
		"is_admin": bool(user.is_admin),
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

	frontend_origin = (request.headers.get("origin") or "").strip().rstrip("/")
	if frontend_origin:
		request.session["oauth_frontend_origin"] = frontend_origin

	redirect_uri = REDIRECT_URI or str(request.url_for("google_callback"))
	print(f"Google OAuth login redirect_uri={redirect_uri}")

	return await google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
	google = oauth.create_client("google")
	if google is None:
		raise HTTPException(status_code=500, detail="Google OAuth client is not available")

	frontend_origin = (request.session.get("oauth_frontend_origin") or "").strip().rstrip("/")
	fallback_success = f"{frontend_origin}/oauth-success" if frontend_origin else FRONTEND_AUTH_SUCCESS_URL
	fallback_error = f"{frontend_origin}/login?oauth=failed" if frontend_origin else FRONTEND_AUTH_ERROR_URL

	success_url = FRONTEND_AUTH_SUCCESS_URL
	error_url = FRONTEND_AUTH_ERROR_URL
	if APP_ENV == "production" and frontend_origin:
		if "localhost" in success_url or "127.0.0.1" in success_url:
			success_url = fallback_success
		if "localhost" in error_url or "127.0.0.1" in error_url:
			error_url = fallback_error

	try:
		token = await google.authorize_access_token(request)
		user_info = token.get("userinfo")
		if not user_info:
			user_info = await google.parse_id_token(request, token)

		if not user_info:
			raise HTTPException(status_code=400, detail="Unable to fetch user profile from Google")

		user_email = user_info.get("email", "").lower()
		is_admin = user_email == ADMIN_EMAIL
		user_name = user_info.get("name", "User")

		# Create or get user in database
		db_user = db.query(models.User).filter(models.User.email == user_email).first()
		if not db_user:
			# Create new user from Google OAuth
			db_user = models.User(
				name=user_name,
				email=user_email,
				password_hash="",  # Empty for OAuth users
				is_admin=1 if is_admin else 0,
			)
			db.add(db_user)
			db.commit()
			db.refresh(db_user)
		else:
			# Update admin status if needed
			if is_admin and not db_user.is_admin:
				db_user.is_admin = 1
				db.commit()

		# Store database user ID (integer) in session, not Google sub
		session_user = {
			"id": db_user.id,  # Database integer ID, not Google sub string
			"email": user_email,
			"name": user_name,
			"is_admin": bool(db_user.is_admin),
		}
		request.session["user"] = session_user
		return RedirectResponse(url=success_url, status_code=302)
	except Exception as e:
		error_message = str(e)
		print(f"Google OAuth error: {error_message}")
		request.session.pop("user", None)
		redirect_url = error_url
		if APP_ENV != "production":
			separator = "&" if "?" in redirect_url else "?"
			redirect_url = f"{redirect_url}{separator}reason={quote_plus(error_message[:180])}"
		return RedirectResponse(url=redirect_url, status_code=302)


@router.get("/me")
async def get_current_user(request: Request):
	user = request.session.get("user")
	if not user:
		raise HTTPException(status_code=401, detail="Not logged in")
	# Ensure is_admin is included
	if "is_admin" not in user:
		user["is_admin"] = False
	return user


@router.post("/logout")
async def logout(request: Request):
	request.session.pop("user", None)
	return {"message": "Logged out"}
