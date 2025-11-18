import os
from datetime import timedelta

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_cors import CORS

# ------------------------------------------------
# App & config
# ------------------------------------------------
app = Flask(__name__)

# Allow CORS from frontend (adjust for production)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# DB: use env var if provided, else local SQLite
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "sqlite:///todo.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# JWT config
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)


# ------------------------------------------------
# Models
# ------------------------------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    todos = db.relationship("Todo", backref="user", lazy=True)

    def set_password(self, password: str):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, password)


class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)


# ------------------------------------------------
# Helper
# ------------------------------------------------
def get_current_user_obj():
    user_id = get_jwt_identity()
    return User.query.get(user_id)


# ------------------------------------------------
# Auth routes
# ------------------------------------------------
@app.post("/api/register")
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


@app.post("/api/login")
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token}), 200


# ------------------------------------------------
# Todos CRUD (protected)
# ------------------------------------------------
@app.get("/api/todos")
@jwt_required()
def list_todos():
    user = get_current_user_obj()
    todos = Todo.query.filter_by(user_id=user.id).order_by(Todo.id.desc()).all()
    return jsonify([
        {"id": t.id, "title": t.title, "completed": t.completed}
        for t in todos
    ])


@app.post("/api/todos")
@jwt_required()
def create_todo():
    user = get_current_user_obj()
    data = request.get_json() or {}
    title = data.get("title", "").strip()

    if not title:
        return jsonify({"message": "Title is required"}), 400

    todo = Todo(title=title, completed=False, user_id=user.id)
    db.session.add(todo)
    db.session.commit()

    return jsonify({
        "id": todo.id,
        "title": todo.title,
        "completed": todo.completed
    }), 201


@app.put("/api/todos/<int:todo_id>")
@jwt_required()
def update_todo(todo_id):
    user = get_current_user_obj()
    todo = Todo.query.filter_by(id=todo_id, user_id=user.id).first()
    if not todo:
        return jsonify({"message": "Todo not found"}), 404

    data = request.get_json() or {}
    title = data.get("title")
    completed = data.get("completed")

    if title is not None:
        todo.title = title.strip()
    if completed is not None:
        todo.completed = bool(completed)

    db.session.commit()
    return jsonify({
        "id": todo.id,
        "title": todo.title,
        "completed": todo.completed
    })


@app.delete("/api/todos/<int:todo_id>")
@jwt_required()
def delete_todo(todo_id):
    user = get_current_user_obj()
    todo = Todo.query.filter_by(id=todo_id, user_id=user.id).first()
    if not todo:
        return jsonify({"message": "Todo not found"}), 404

    db.session.delete(todo)
    db.session.commit()
    return jsonify({"message": "Todo deleted"}), 200


# ------------------------------------------------
# Health check
# ------------------------------------------------
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"}), 200
@app.get("/")
def index():
    return "Flask ToDo API is running. Try /api/health"


# ------------------------------------------------
# Bootstrap DB on first run (dev)
# ------------------------------------------------
with app.app_context():
    db.create_all()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
