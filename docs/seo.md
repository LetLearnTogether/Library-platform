# Search engine indexing

The frontend publishes `robots.txt` and `sitemap.xml` from `frontend/public/`.
The sitemap lists only public pages intended for search results. The app adds
page-specific titles, descriptions, and canonical URLs for the homepage, About
page, and public quiz catalog. Signed-in pages and other routes are marked
`noindex`.

## Submit the site to Google

1. Open [Google Search Console](https://search.google.com/search-console/) and
   add a **Domain** property for `letlearntogetther.com`.
2. Google will provide a DNS TXT verification record. Add that exact record in
   Cloudflare DNS for the domain, wait for it to propagate, then click Verify
   in Search Console. Keep the TXT record in place.
3. In the verified property, open **Sitemaps** and submit
   `https://letlearntogetther.com/sitemap.xml`.
4. Use **URL Inspection** for `https://letlearntogetther.com/` and request
   indexing. Google decides when and whether to crawl and index a submitted URL.
5. After Google processes the site, review indexing status and any crawl issues
   in Search Console. Search visibility and ranking are not immediate or
   guaranteed.

The canonical site URL is HTTPS on `letlearntogetther.com`. The live site must
serve `robots.txt` as plain text and `sitemap.xml` as XML; if either returns the
app's HTML page, deploy the current frontend before submitting the sitemap.
