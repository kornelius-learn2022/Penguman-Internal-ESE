import datetime

try:
    import jwt

    PyJWTError = getattr(jwt, "PyJWTError", getattr(jwt, "JWTError", Exception))
    ExpiredSignatureError = getattr(jwt, "ExpiredSignatureError", Exception)
except ImportError:
    from jose import jwt, JWTError as PyJWTError, ExpiredSignatureError

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def create_access_token(data: dict):
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("id_admin"):
            raise HTTPException(status_code=401, detail="Token tidak valid")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Kredensial tidak sah")
