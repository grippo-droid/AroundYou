# NearMe Discovery Hub - Backend

This is the FastAPI backend for the NearMe Discovery Hub application.

## Tech Stack
-   **Framework**: FastAPI
-   **Database**: MongoDB (Motor async driver)
-   **Authentication**: JWT (HTTP-Only Cookies)
-   **Validation**: Pydantic
-   **Security**: Argon2 password hashing

## Setup

1.  **Create a virtual environment**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Environment Variables**:
    Copy `.env.example` to `.env` and update the values.
    ```bash
    cp .env.example .env
    ```
    Make sure MongoDB is running locally or provide a valid URI.

4.  **Run the application**:
    ```bash
    uvicorn app.main:app --reload
    ```

## API Documentation
Once running, visit `http://localhost:8000/docs` for the interactive Swagger UI.

## Project Structure
-   `app/config`: Configuration and database connection.
-   `app/core`: Security and dependencies.
-   `app/models`: Database models (MongoDB).
-   `app/schemas`: Pydantic schemas (Request/Response).
-   `app/services`: Business logic.
-   `app/routes`: API endpoints.
-   `app/utils`: Helper functions.
