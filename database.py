import mysql.connector
from mysql.connector import Error

from config import (
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME
)


def get_db():
    """
    Create and return a MySQL database connection.
    """

    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=True
        )

        return connection

    except Error as e:
        print("Database connection error:", e)
        return None