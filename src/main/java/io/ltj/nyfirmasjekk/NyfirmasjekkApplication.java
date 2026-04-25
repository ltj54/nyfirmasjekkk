package io.ltj.nyfirmasjekk;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class NyfirmasjekkApplication {

    public static void main(String[] args) {
        SpringApplication.run(NyfirmasjekkApplication.class, args);
    }

}
