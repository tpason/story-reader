// Barrel for the story data-access layer, split by domain for navigability:
//  - catalog:   story lists/cursors, categories, single story, recommendations
//  - discovery: recently polished/updated rails + paged variants
//  - chapters:  chapter lists/cursors, search, reader payload, audio
// Shared row types, mappers, and cursor/page helpers live in ./stories/_internal.
// Re-exported here so existing `@/lib/stories` imports keep working unchanged.
export * from "./stories/catalog";
export * from "./stories/discovery";
export * from "./stories/chapters";
export * from "./stories/analytics";
