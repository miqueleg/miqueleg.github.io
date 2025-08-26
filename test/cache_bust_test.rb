require 'minitest/autorun'
require 'digest/md5'

# Stub Liquid to avoid loading the full gem in tests
module Liquid
  class Template
    def self.register_filter(*); end
  end
end

require_relative '../_plugins/cache-bust'

class CacheBustTest < Minitest::Test
  include Jekyll::CacheBust

  def test_bust_file_cache_adds_md5_hash
    file_name = '/assets/css/bootstrap.min.css'
    result = bust_file_cache(file_name)
    digest = Digest::MD5.hexdigest(File.read('assets/css/bootstrap.min.css'))
    assert_equal "#{file_name}?#{digest}", result
  end

  def test_bust_css_cache_digests_all_sass_files
    file_name = '/assets/css/main.css'
    result = bust_css_cache(file_name)
    contents = Dir['assets/_sass/**/*'].select { |f| File.file?(f) }.map { |f| File.read(f) }.join
    digest = Digest::MD5.hexdigest(contents)
    assert_equal "#{file_name}?#{digest}", result
  end
end

