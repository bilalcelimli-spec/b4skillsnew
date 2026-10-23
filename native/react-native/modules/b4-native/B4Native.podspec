Pod::Spec.new do |s|
  s.name         = "B4Native"
  s.version      = "1.0.0"
  s.summary      = "B4Skills audio, preferences and cookie helpers"
  s.homepage     = "https://b4skills.com"
  s.license      = "UNLICENSED"
  s.author       = "B4Skills"
  s.platforms    = { :ios => "16.0", :osx => "14.0" }
  s.source       = { :path => "." }
  s.source_files = "apple/**/*.{h,m}"
  s.frameworks   = "AVFoundation"
  s.dependency "React-Core"
end
