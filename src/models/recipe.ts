/**
 *        @file recipe.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary Recipe Interface
 * @description Defines the structure for the recipe model
 */

export interface Recipe {
  id: number;
  ingredients: string | null;
  instructions: string | null;
  original_video_url: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
