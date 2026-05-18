# Farish

A Django + React marketplace platform for fashion products. Admin dashboard for managing product collections and customer orders with custom sizing.

## Tech Stack

**Backend**
- Django 5.x
- Django REST Framework
- Simple JWT Authentication
- SQLite (development) / PostgreSQL (production)

**Frontend**
- React 18 (Create React App)
- React Router
- Context API for auth

## Features

- **User Roles**: Admin and Customer roles with JWT authentication
- **Product Management**: CRUD posts with images/videos, categories, pricing, availability
- **Order Management**: Customer orders with custom sizing measurements (key-value pairs)
- **Customer Search**: Find customers by name, email, or phone
- **WhatsApp Integration**: Auto-generated WhatsApp links for product enquiries

## Project Structure

```
farish/
├── config/          # Django settings
├── store/           # Django app (models, views, serializers)
│   ├── models.py    # UserProfile, Post, PostMedia, Category, Order
│   ├── views.py
│   └── serializers.py
├── farish-frontend/   # React frontend
│   └── src/
│       └── pages/
│           └── Dashboard.jsx  # Admin dashboard
└── venv/
```

## Setup

### Backend

1. Create virtual environment and install dependencies:
```bash
cd farish
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. Set environment variables (`.env`):
```
SECRET_KEY=your-secret-key
DEBUG=True
COMPANY_WHATSAPP=+8801XXXXXXXXX
FRONTEND_BASE_URL=http://localhost:3000
```

3. Run migrations:
```bash
python manage.py migrate
python manage.py createsuperuser
```

4. Start Django server:
```bash
python manage.py runserver
```

### Frontend

```bash
cd farish-frontend
npm install
npm start
```

## API Endpoints

- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Get JWT tokens
- `GET /api/posts/` - List products
- `GET /api/my-posts/` - Admin's posts
- `POST /api/posts/` - Create post
- `GET /api/orders/` - List orders
- `POST /api/orders/` - Create order

## Usage

1. Register/login to get JWT token
2. Admin accesses `/dashboard` to manage products and orders
3. Products can have multiple images/videos with cover selection
4. Orders link customers to products with address and custom sizing