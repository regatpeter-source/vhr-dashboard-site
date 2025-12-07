#!/bin/bash
# Helper script to initialize Gradle wrapper if needed

# Check if gradlew exists
if [ ! -f "gradlew" ]; then
    echo "📦 Initializing Gradle wrapper..."
    
    # Try to download gradle-wrapper.jar
    GRADLE_WRAPPER_JAR="gradle/wrapper/gradle-wrapper.jar"
    
    if [ ! -f "$GRADLE_WRAPPER_JAR" ]; then
        echo "⬇️  Downloading Gradle wrapper JAR..."
        mkdir -p gradle/wrapper
        
        # Download the wrapper JAR (typically from gradle services)
        curl -L https://gradle.org/release-candidate/gradle-8.7-bin.zip -o gradle_temp.zip 2>/dev/null
        
        if [ -f "gradle_temp.zip" ]; then
            unzip -q gradle_temp.zip
            mv gradle-8.7/lib/gradle-wrapper.jar gradle/wrapper/
            rm -rf gradle_temp.zip gradle-8.7
            echo "✅ Gradle wrapper JAR downloaded"
        else
            echo "⚠️  Could not download wrapper JAR, will use gradle command instead"
        fi
    fi
    
    echo "✅ Gradle wrapper initialized"
fi

# Run the build
./gradlew "$@"
