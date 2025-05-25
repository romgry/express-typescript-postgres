/* ============================================================================================== */
/* DATABASE FUNCTIONS - START                                                                     */
/* ============================================================================================== */

/*==============================================================*/
/* FUNCTION: recipe_insert_one                                  */
/*==============================================================*/
CREATE OR REPLACE FUNCTION public.recipe_insert_one(
    p_ingredients TEXT,
    p_instructions TEXT,
    p_original_video_url VARCHAR(1024)
)
RETURNS SETOF public.recipes -- Specifies that the function returns a set of rows of type public.recipes
LANGUAGE plpgsql
AS $$
DECLARE
    new_id INTEGER;
BEGIN
    -- Insert the new recipe and get the new id
    INSERT INTO public.recipes (
        ingredients,
        instructions,
        original_video_url,
        created_at,
        updated_at
    ) VALUES (
        p_ingredients,
        p_instructions,
        p_original_video_url,
        CURRENT_TIMESTAMP, -- Explicitly set created_at
        CURRENT_TIMESTAMP  -- Explicitly set updated_at
    ) RETURNING id INTO new_id;

    -- Return the newly inserted row
    -- Using RETURN QUERY to execute a query and return its results
    RETURN QUERY SELECT * FROM public.recipes WHERE recipes.id = new_id;
END;
$$;

ALTER FUNCTION public.recipe_insert_one(TEXT, TEXT, VARCHAR(1024)) OWNER TO postgres;

COMMENT ON FUNCTION public.recipe_insert_one(TEXT, TEXT, VARCHAR(1024)) IS
'Inserts a new recipe into the public.recipes table and returns the newly inserted row.
Handles nullable text and varchar fields for ingredients, instructions, and original_video_url.
Explicitly sets created_at and updated_at to CURRENT_TIMESTAMP.';

/* ============================================================================================== */
/* DATABASE FUNCTIONS - END                                                                       */
/* ============================================================================================== */
