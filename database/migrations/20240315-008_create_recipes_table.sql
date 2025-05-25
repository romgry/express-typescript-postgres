/* ============================================================================================== */
/* DATABASE SCHEMA - START                                                                        */
/* ============================================================================================== */

/*==============================================================*/
/* TABLE: recipes                                               */
/*==============================================================*/
CREATE TABLE IF NOT EXISTS public.recipes(
    id SERIAL NOT NULL,
    ingredients TEXT NULL,
    instructions TEXT NULL,
    original_video_url VARCHAR(1024) NULL,
    CONSTRAINT pk_recipes PRIMARY KEY (id)
)
INHERITS (public.__creation_log, public.__modification_log, public.__deletion_log)
WITH (OIDS=FALSE);

COMMENT ON TABLE public.recipes IS
'Stores information about recipes, including their ingredients, instructions, and a link to the original video.';

ALTER TABLE public.recipes OWNER TO postgres;

/* ============================================================================================== */
/* DATABASE SCHEMA - END                                                                          */
/* ============================================================================================== */
