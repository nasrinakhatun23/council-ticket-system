# from sqlalchemy import Column, Integer, String
# from database import Base


# class User(Base):
#     __tablename__ = "users"

#     id = Column(Integer, primary_key=True, index=True)
#     name = Column(String, nullable=False)
#     email = Column(String, unique=True, index=True, nullable=False)
#     password_hash = Column(String, nullable=False)


# class Ticket(Base):
#     __tablename__ = "tickets"

#     id = Column(Integer, primary_key=True, index=True)
#     title = Column(String)
#     description = Column(String)
#     image_url = Column(String)
#     status = Column(String, default="Pending")




from sqlalchemy import Column, Integer, String
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)

    # ✅ ADD THIS ONLY
    location = Column(String)

    image_url = Column(String)
    status = Column(String, default="Pending")