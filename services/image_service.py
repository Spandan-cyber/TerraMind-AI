import ee


# ==========================================================
# TRUE COLOR SATELLITE IMAGE
# ==========================================================

def get_rgb_image(image):

    return image.visualize(

        bands=["B4", "B3", "B2"],

        min=0,

        max=3000

    )


# ==========================================================
# NDVI IMAGE
# ==========================================================

def get_ndvi_visual(ndvi):

    return ndvi.visualize(

        min=0,

        max=1,

        palette=[

            "#d73027",   # Red
            "#fee08b",   # Yellow
            "#1a9850"    # Green

        ]

    )


# ==========================================================
# THUMBNAIL URL
# ==========================================================

def get_thumbnail(image, geometry):

    return image.getThumbURL({

        "region": geometry,

        "dimensions": 800,

        "format": "png"

    })


# ==========================================================
# RGB IMAGE URL
# ==========================================================

def get_rgb_url(image, geometry):

    rgb = get_rgb_image(image)

    return get_thumbnail(rgb, geometry)


# ==========================================================
# NDVI IMAGE URL
# ==========================================================

def get_ndvi_url(ndvi, geometry):

    ndvi_img = get_ndvi_visual(ndvi)

    return get_thumbnail(ndvi_img, geometry)
