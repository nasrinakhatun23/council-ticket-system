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




from sqlalchemy import Column, Integer, String, UniqueConstraint
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
    vote_count = Column(Integer, default=0)
    status = Column(String, default="Pending")


class TicketVote(Base):
    __tablename__ = "ticket_votes"
    __table_args__ = (UniqueConstraint("ticket_id", "voter_id", name="uq_ticket_voter"),)

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False, index=True)
    voter_id = Column(String, nullable=False, index=True)