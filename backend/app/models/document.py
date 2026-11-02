from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from backend.app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, nullable=False)
    document_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="Under Review")
    verification_token = Column(String, nullable=True)
    approved_by = Column(Integer, nullable=True)
    uploaded_by = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())