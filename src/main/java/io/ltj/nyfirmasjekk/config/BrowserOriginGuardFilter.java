package io.ltj.nyfirmasjekk.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class BrowserOriginGuardFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {
        if (isCompanyCheckMutation(request) && isBrowserRequest(request)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        chain.doFilter(request, response);
    }

    private static boolean isCompanyCheckMutation(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/company-check/")
                && !"GET".equalsIgnoreCase(request.getMethod())
                && !"HEAD".equalsIgnoreCase(request.getMethod())
                && !"OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    private static boolean isBrowserRequest(HttpServletRequest request) {
        return request.getHeader("Origin") != null || request.getHeader("Sec-Fetch-Site") != null;
    }
}
