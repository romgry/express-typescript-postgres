/**
 *        @file src/routes/recipe/index.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary Recipe routes
 * @description Handles routing for recipe-related endpoints
 */

import { Router } from 'express'
import recipeController from '../../controllers/recipe_controller' // Default import

const router = Router()

// Route for uploading an Instagram recipe
// Full path will be /v0/recipes/upload/instagram (assuming /v0 and /recipes are prefixed by main router)
router.post(
  '/upload/instagram',
  recipeController.uploadInstagramRecipe
)

export default router
