package com.company.skillmd.search;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/search} (PRD §5.3): visibility-scoped $text search,
 * metadata-only, grouped {@code { team, open }}.
 */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(searchService.search(q, scope, tag, limit));
    }
}
