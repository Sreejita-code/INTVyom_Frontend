// The page file is `IndexPage.tsx`, not `Index.tsx`: on a case-insensitive filesystem `./Index`
// resolves to this barrel itself, which is a circular import. Keeping the two names distinct is
// what lets `tsc` and the bundler agree.
export { default } from "./IndexPage";
