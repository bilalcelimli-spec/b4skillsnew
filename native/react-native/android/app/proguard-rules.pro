# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# b4-native: the JS bridge looks up module, view manager and event names at runtime.
# React Native's own consumer rules keep @ReactMethod/@ReactProp members; this keeps the
# rest of our small module intact so a rename can never break the exam bridge.
-keep class com.b4skills.b4native.** { *; }

# Readable crash stack traces after obfuscation (upload mapping.txt with each release).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
