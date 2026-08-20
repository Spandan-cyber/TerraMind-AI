"""
==========================================================
TerraMind Analysis Routes
==========================================================
"""

from flask import Blueprint
from flask import jsonify
from flask import session

from services.analysis_service import AnalysisService


analysis_bp = Blueprint(

    "analysis",

    __name__,

    url_prefix="/api"

)


# ==========================================================
# POST /api/analyze/<farm_id>
# ==========================================================

@analysis_bp.route("/analyze/<farm_id>", methods=["POST"])
def analyze(farm_id):

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({

            "success": False,

            "message": "Unauthorized"

        }), 401

    try:

        result = AnalysisService.run(

            farm_id=farm_id,

            user_id=user_id

        )

        return jsonify(result)

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500

#==========================================================
# GET /api/advisory
#==========================================================

@analysis_bp.route("/advisory", methods=["GET"])
def advisory():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({

            "success": False,

            "message": "Unauthorized"

        }), 401

    try:

        advisory = AnalysisService.get_latest_advisory(user_id)

        return jsonify(advisory)

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


#==========================================================
# GET /api/history
#==========================================================


@analysis_bp.route("/history", methods=["GET"])
def all_history():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({

            "success": False,

            "message": "Unauthorized"

        }),401

    try:
        history = AnalysisService.get_all_history(
            user_id
        )

        return jsonify(history)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================================
# GET /api/history/<farm_id>
# ==========================================================

@analysis_bp.route("/history/<farm_id>", methods=["GET"])
def history(farm_id):

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({

            "success": False,

            "message": "Unauthorized"

        }), 401

    try:

        history = AnalysisService.get_history(

            farm_id=farm_id,

            user_id=user_id

        )

        return jsonify({

            "success": True,

            "history": history

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# ==========================================================
# POST /api/history
# Save an already generated analysis
# ==========================================================

@analysis_bp.route("/history", methods=["POST"])
def save_history():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({

            "success": False,

            "message": "Unauthorized"

        }), 401

    try:

        from flask import request

        data = request.get_json()

        AnalysisService.save_history(

            user_id=user_id,

            farm_id=data["farm_id"],

            analysis=data

        )

        return jsonify({

            "success": True,

            "message": "Analysis saved successfully."

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500