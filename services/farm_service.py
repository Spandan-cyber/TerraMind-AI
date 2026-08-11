import uuid
from services.supabase_service import supabase_admin as supabase


class FarmService:

    # =====================================================
    # CREATE FARM
    # =====================================================

    @staticmethod
    def create_farm(user_id, data):

        payload = {

            "user_id": user_id,

            "farm_name": data.get("farm_name"),

            "crop": data.get("crop"),

            "village": data.get("village"),

            "district": data.get("district"),

            "state": data.get("state"),

            "notes": data.get("notes"),

            "area": data.get("area"),

            "latitude": data.get("latitude"),

            "longitude": data.get("longitude"),

            "centroid": data.get("centroid"),

            "bbox": data.get("bbox"),

            "boundary": data.get("boundary")

        }

        response = (

            supabase

            .table("farms")

            .insert(payload)

            .execute()

        )

        if response.data:

            return response.data[0]

        return None


    # =====================================================
    # GET ALL FARMS
    # =====================================================

    @staticmethod
    def get_farms(user_id):

        response = (

            supabase

            .table("farms")

            .select("*")

            .eq("user_id", user_id)

            .order("created_at", desc=True)

            .execute()

        )

        return response.data


    # =====================================================
    # GET ONE FARM
    # =====================================================

    @staticmethod
    def get_farm(user_id, farm_id):

        response = (

            supabase

            .table("farms")

            .select("*")

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .limit(1)

            .execute()

        )

        if response.data:

            return response.data[0]

        return None


    # =====================================================
    # UPDATE FARM
    # =====================================================

    @staticmethod
    def update_farm(user_id, farm_id, data):

        payload = {}

        allowed = [

            "farm_name",

            "crop",

            "village",

            "district",

            "state",

            "notes",

            "area",

            "latitude",

            "longitude",

            "centroid",

            "bbox",

            "boundary"

        ]

        for field in allowed:

            if field in data:

                payload[field] = data[field]

        response = (

            supabase

            .table("farms")

            .update(payload)

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .execute()

        )

        if response.data:

            return response.data[0]

        return None


    # =====================================================
    # DELETE FARM
    # =====================================================

    @staticmethod
    def delete_farm(user_id, farm_id):

        (

            supabase

            .table("farms")

            .delete()

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .execute()

        )

        return True


    # =====================================================
    # COUNT FARMS
    # =====================================================

    @staticmethod
    def farm_count(user_id):

        response = (

            supabase

            .table("farms")

            .select("id")

            .eq("user_id", user_id)

            .execute()

        )

        return len(response.data)


    # =====================================================
    # TOTAL AREA
    # =====================================================

    @staticmethod
    def total_area(user_id):

        farms = FarmService.get_farms(user_id)

        total = 0.0

        for farm in farms:

            total += float(farm.get("area") or 0)

        return round(total, 2)


    # =====================================================
    # DASHBOARD SUMMARY
    # =====================================================

    @staticmethod
    def dashboard_summary(user_id):

        farms = FarmService.get_farms(user_id)

        summary = {

            "farm_count": len(farms),

            "total_area": 0,

            "healthy_farms": 0,

            "latest_farm": None

        }

        for farm in farms:

            summary["total_area"] += float(

                farm.get("area") or 0

            )

            if farm.get("health") == "Healthy":

                summary["healthy_farms"] += 1

        summary["total_area"] = round(

            summary["total_area"],

            2

        )

        if farms:

            summary["latest_farm"] = farms[0]

        return summary


    # =====================================================
    # GET POLYGON ONLY
    # =====================================================

    @staticmethod
    def get_polygon(user_id, farm_id):

        response = (

            supabase

            .table("farms")

            .select(

                "boundary"

            )

            .eq("id", farm_id)

            .eq("user_id", user_id)

            .limit(1)

            .execute()

        )

        if response.data:

            return response.data[0]["boundary"]

        return None


    # =====================================================
    # EXISTS
    # =====================================================

    @staticmethod
    def exists(user_id, farm_id):

        farm = FarmService.get_farm(

            user_id,

            farm_id

        )

        return farm is not None

    @staticmethod
    def get_profile(user_id):

        response = (
            supabase
            .table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        if response.data:
            return response.data[0]

        return None

    @staticmethod
    def update_profile(user_id, data, image=None):

        payload = {}

        if image:

            ext = image.filename.rsplit(".", 1)[-1].lower()

            filename = f"{user_id}/{uuid.uuid4()}.{ext}"

            image_bytes = image.read()

            supabase.storage.from_("profile-images").upload(
                path=filename,
                file=image_bytes,
                file_options={
                    "content-type": image.mimetype,
                    "upsert": "true"
                }
            )

            public_url = (
                supabase.storage
                .from_("profile-images")
                .get_public_url(filename)
            )

            payload["profile_image"] = public_url

        allowed = ["full_name", "phone"]

        for field in allowed:

            if field in data:
                payload[field] = data[field]

        if not payload:
            return FarmService.get_profile(user_id)

        # Upsert instead of update: some accounts never got a
        # profiles row created at registration (e.g. if that
        # insert failed before the RLS fix). A plain update()
        # silently does nothing when no row exists — upsert
        # creates it if missing, updates it if it's there.
        payload["id"] = user_id

        response = (
            supabase
            .table("profiles")
            .upsert(payload, on_conflict="id")
            .execute()
        )

        if response.data:
            return response.data[0]

        return None