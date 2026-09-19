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

# Masa berlaku token JWT: 12 Jam
ACCESS_TOKEN_EXPIRE_HOURS = 12


def create_access_token(data: dict):
    """
    Membuat token JWT dengan masa kedaluwarsa tepat 12 jam.
    """
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        hours=ACCESS_TOKEN_EXPIRE_HOURS
    )
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validasi token JWT pada setiap endpoint admin.
    Jika token expired (melebihi 12 jam) atau rusak, tolak akses dengan HTTP 401.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("id_admin"):
            raise HTTPException(status_code=401, detail="Token tidak valid: ID admin tidak ditemukan.")
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token kedaluwarsa (masa berlaku 12 jam telah habis). Silakan login kembali.",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token has expired\""},
        )
    except (PyJWTError, Exception):
        raise HTTPException(
            status_code=401,
            detail="Token tidak valid atau sesi telah berakhir.",
            headers={"WWW-Authenticate": "Bearer"},
        )
