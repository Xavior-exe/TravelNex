<<<<<<< HEAD
import mysql.connector
from mysql.connector import Error

from config import (
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME
)
=======
# database.py

import mysql.connector
from mysql.connector import Error
from config import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0


def get_db():
    """
    Create and return a MySQL database connection.
<<<<<<< HEAD
    """

    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
=======
    Credentials are read from environment variables via config.py.
    """
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=True
        )
<<<<<<< HEAD

=======
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0
        return connection

    except Error as e:
        print("Database connection error:", e)
<<<<<<< HEAD
        return None
=======
        return None
>>>>>>> 43e8055e7695590d6ebad290c516893cce2008f0
