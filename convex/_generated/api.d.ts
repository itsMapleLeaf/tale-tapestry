/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as characters from "../characters.js";
import type * as http from "../http.js";
import type * as locations from "../locations.js";
import type * as players from "../players.js";
import type * as prompts from "../prompts.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as worlds from "../worlds.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  characters: typeof characters;
  http: typeof http;
  locations: typeof locations;
  players: typeof players;
  prompts: typeof prompts;
  seed: typeof seed;
  users: typeof users;
  worlds: typeof worlds;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
