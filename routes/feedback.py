"""
==========================================================
TerraMind Feedback Route
==========================================================
"""

from flask import Blueprint, jsonify, request, session

from services.supabase_service import supabase_admin

feedback_bp = Blueprint(
    "feedback",
    __name__,
    url_prefix="/api"
)


@feedback_bp.route("/feedback", methods=["POST"])
def submit_feedback():

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 401

    data = request.get_json() or {}

    message = (data.get("message") or "").strip()
    rating = data.get("rating")

    if not message:
        return jsonify({
            "success": False,
            "message": "Feedback message is required."
        }), 400

    payload = {
        "user_id": user_id,
        "message": message,
        "rating": rating
    }

    try:
        # Trusted server-side write, scoped explicitly by user_id above —
        # same pattern used for farms/analysis_history, bypasses RLS safely.
        supabase_admin.table("feedback").insert(payload).execute()

        return jsonify({
            "success": True,
            "message": "Thanks for your feedback!"
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500