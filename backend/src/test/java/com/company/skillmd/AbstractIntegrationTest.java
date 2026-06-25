package com.company.skillmd;

import de.flapdoodle.embed.mongo.distribution.Version;
import de.flapdoodle.embed.mongo.transitions.Mongod;
import de.flapdoodle.embed.mongo.transitions.RunningMongodProcess;
import de.flapdoodle.reverse.TransitionWalker;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    private static final TransitionWalker.ReachedState<RunningMongodProcess> MONGO =
        Mongod.instance().start(Version.Main.V7_0);

    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        var address = MONGO.current().getServerAddress();
        registry.add("spring.data.mongodb.uri", () ->
            "mongodb://" + address.getHost() + ":" + address.getPort() + "/skillmd-test");
    }
}
