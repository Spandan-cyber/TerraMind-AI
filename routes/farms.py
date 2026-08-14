from flask import Blueprint
from flask import jsonify
from flask import request
from flask import session

from services.farm_service import FarmService

farms = Blueprint("farms", __name__)


# ======================================================
# Authentication
# ======================================================

def require_login():

    user_id = session.get("user_id")

    if not user_id:

        return None

    return user_id


# ======================================================
# GET ALL FARMS
# ======================================================

@farms.route("/api/farms", methods=["GET"])
def get_farms():

    user_id = require_login()

    if not user_id:

        return jsonify({

            "message":"Unauthorized"

        }),401

    try:

        farms = FarmService.get_farms(user_id)
        if farms is None:
            farms = []

        return jsonify(farms)

    except Exception as e:

        return jsonify({

            "message":str(e)

        }),500

    # ======================================================
# CREATE FARM
# ======================================================

@farms.route("/api/farms", methods=["POST"])
def create_farm():

    user_id = require_login()

    if not user_id:

        return jsonify({

            "message":"Unauthorized"

        }),401

    data = request.get_json()

    try:

        farm = FarmService.create_farm(

            user_id=user_id,

            data=data

        )

        return jsonify(farm),201

    except Exception as e:

        return jsonify({

            "message":str(e)

        }),500

    # ======================================================
# GET SINGLE FARM
# ======================================================

@farms.route("/api/farms/<farm_id>", methods=["GET"])
def get_farm(farm_id):

    user_id = require_login()

    if not user_id:

        return jsonify({

            "message":"Unauthorized"

        }),401

    farm = FarmService.get_farm(

        user_id,

        farm_id

    )

    if not farm:

        return jsonify({

            "message":"Farm not found"

        }),404

    return jsonify(farm)
# ======================================================
# UPDATE FARM
# ======================================================

@farms.route("/api/farms/<farm_id>", methods=["PUT"])
def update_farm(farm_id):

    user_id = require_login()

    if not user_id:

        return jsonify({

            "message":"Unauthorized"

        }),401

    data = request.get_json()

    try:

        farm = FarmService.update_farm(

            user_id,

            farm_id,

            data

        )

        return jsonify(farm)

    except Exception as e:

        return jsonify({

            "message":str(e)

        }),500

# ======================================================
# GET SINGLE FARM
# ======================================================


# ======================================================
# DELETE FARM
# ======================================================

@farms.route("/api/farms/<farm_id>", methods=["DELETE"])
def delete_farm(farm_id):

    user_id = require_login()

    if not user_id:

        return jsonify({

            "message":"Unauthorized"

        }),401

    try:

        FarmService.delete_farm(

            user_id,

            farm_id

        )

        return jsonify({

            "success":True

        })

    except Exception as e:

        return jsonify({

            "message":str(e)

        }),500
    