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




from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Integer, default=0)  # 0 = user, 1 = admin


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    category = Column(String, default="General")

    # ✅ ADD THIS ONLY
    location = Column(String)
    assigned_council = Column(String, default="General Council")
    assigned_council_email = Column(String)

    image_url = Column(String)
    vote_count = Column(Integer, default=0)
    priority = Column(String, default="Low")
    escalated = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    status = Column(String, default="Pending")


class TicketVote(Base):
    __tablename__ = "ticket_votes"
    __table_args__ = (UniqueConstraint("ticket_id", "voter_id", name="uq_ticket_voter"),)

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False, index=True)
    voter_id = Column(String, nullable=False, index=True)


class TicketFeedback(Base):
    __tablename__ = "ticket_feedback"
    __table_args__ = (UniqueConstraint("ticket_id", "reviewer_id", name="uq_ticket_feedback_reviewer"),)

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False, index=True)
    reviewer_id = Column(String, nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=False), server_default=func.now())


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=False), server_default=func.now())