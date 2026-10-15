
from flask import jsonify, request
from .database import get_db


ENTITY_CONFIG = {
    "authors": ["name"],
    "genres": ["name"],
    "publishers": ["name"],
    "books": [
        "title",
        "author_id",
        "genre_id",
        "publisher_id",
        "year"
    ],
}


def row_dict(row):
    return dict(row)

TEXT_FIELDS = ("name", "title")


def has_blank_text(data):
    for field in TEXT_FIELDS:
        if field in data:
            value = data[field]
            if not isinstance(value, str) or not value.strip():
                return True
    return False

def register_crud(app, table, fields):
    route = f"/{table}"

    # CREATE
    def create():
        data = request.get_json(silent=True) or {}

        if any(field not in data for field in fields):
            return jsonify({"error": "Missing required field"}), 400
        if has_blank_text(data):
            return jsonify({"error": "Text fields must not be empty"}), 400
        values = [data[field] for field in fields]
        placeholders = ",".join("?" for _ in fields)

        db = get_db()

        cursor = db.execute(
            f"""
            INSERT INTO {table} ({','.join(fields)})
            VALUES ({placeholders})
            """,
            values
        )

        db.commit()

        return jsonify({
            "id": cursor.lastrowid,
            **data
        }), 201

    app.add_url_rule(
        route,
        endpoint=f"{table}_create",
        view_func=create,
        methods=["POST"]
    )

    # READ ALL
    def list_items():
        rows = get_db().execute(
            f"SELECT * FROM {table} ORDER BY id"
        ).fetchall()

        return jsonify([
            row_dict(row) for row in rows
        ])

    app.add_url_rule(
        route,
        endpoint=f"{table}_list",
        view_func=list_items,
        methods=["GET"]
    )

    # READ ONE
    def get_item(item_id):
        row = get_db().execute(
            f"SELECT * FROM {table} WHERE id = ?",
            (item_id,)
        ).fetchone()

        if row is None:
            return jsonify({"error": "Not found"}), 404

        return jsonify(row_dict(row))

    app.add_url_rule(
        f"{route}/<int:item_id>",
        endpoint=f"{table}_get",
        view_func=get_item,
        methods=["GET"]
    )

    # UPDATE
    def update(item_id):
        data = request.get_json(silent=True) or {}

        if any(field not in data for field in fields):
            return jsonify({"error": "Missing required field"}), 400
        if has_blank_text(data):
            return jsonify({"error": "Text fields must not be empty"}), 400
        assignments = ",".join(
            f"{field} = ?" for field in fields
        )

        values = [
            data[field] for field in fields
        ] + [item_id]

        db = get_db()

        cursor = db.execute(
            f"""
            UPDATE {table}
            SET {assignments}
            WHERE id = ?
            """,
            values
        )

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404

        return jsonify({
            "id": item_id,
            **data
        })

    app.add_url_rule(
        f"{route}/<int:item_id>",
        endpoint=f"{table}_update",
        view_func=update,
        methods=["PUT"]
    )

    # DELETE
    def delete(item_id):
        db = get_db()

        cursor = db.execute(
            f"DELETE FROM {table} WHERE id = ?",
            (item_id,)
        )

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404

        return jsonify({
            "deleted": item_id
        })

    app.add_url_rule(
        f"{route}/<int:item_id>",
        endpoint=f"{table}_delete",
        view_func=delete,
        methods=["DELETE"]
    )


def register_routes(app):
    for table, fields in ENTITY_CONFIG.items():
        register_crud(app, table, fields)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})
    @app.get("/")
    def index():
        return app.send_static_file("index.html")
