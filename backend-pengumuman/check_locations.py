from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT DISTINCT location FROM teacher_duties;"))
    for row in res:
        print(row[0])
