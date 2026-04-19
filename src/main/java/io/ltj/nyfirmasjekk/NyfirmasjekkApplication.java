package io.ltj.nyfirmasjekk;

import io.ltj.nyfirmasjekk.bootstrap.DevH2StartupGuard;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class NyfirmasjekkApplication {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(NyfirmasjekkApplication.class);
        application.addListeners(new DevH2StartupGuard());
        application.run(args);
    }

}
