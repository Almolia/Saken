#!/bin/bash

echo "Installing Backend Dependencies..."
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "Installing Frontend Dependencies..."
cd frontend
npm install
cd ..

echo "Running Django Migrations..."
cd backend
python manage.py migrate
cd ..

echo "Setup Complete! 🚀"
