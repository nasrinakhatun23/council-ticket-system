from pydantic import BaseModel


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str

class TicketCreate(BaseModel):
    title: str
    description: str

class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    image_url: str
    status: str

    class Config:
        from_attributes = True