import { Router } from 'express'

import app from './app'
import auth from './auth'
import user from './user'
import recipeRoutes from './recipe' // Import the new recipe router

const router = Router()

router.use('/app', app)

router.use('/auth', auth)

router.use('/user', user)

router.use('/recipes', recipeRoutes) // Add the recipe router

export default router
