package com.swiftcare.backend.common.security;

import com.swiftcare.backend.common.exception.UnauthorizedException;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AdminAccessAspect {
    @Before("@annotation(com.swiftcare.backend.common.security.AdminRequired)")
    public void checkAdminAccess() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean admin = authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!admin) throw new UnauthorizedException("Admin access required");
    }
}
