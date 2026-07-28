package com.swiftcare.backend.common.security;

import org.springframework.security.access.AccessDeniedException;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class PremiumAccessAspect {
    @Before("@annotation(com.swiftcare.backend.common.security.PremiumRequired)")
    public void checkPremiumAccess() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean premium = authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(a -> "TIER_PREMIUM".equals(a.getAuthority()));
        if (!premium) throw new AccessDeniedException("This feature requires a Premium subscription.");
    }
}
