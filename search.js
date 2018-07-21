module.exports = {
  word: {
    key: 'word',
    illust: {
      url: '/v1/search/illust',
      options() {
        return {
          target: 'partial_match_for_tags',
          sort: this.auth.user.is_preminum ? 'popular_desc' : 'date_desc'
        }
      }
    },
    illustPopularPreview: {
      url: '/v1/search/popular-preview/illust',
      options: {
        target: 'partial_match_for_tags',
      }
    },
    illustBookmarkRanges: {
      url: '/v1/search/bookmark-ranges/illust',
      options: {
        target: 'partial_match_for_tags',
      }
    },
    novel: {
      url: '/v1/search/novel',
      options() {
        return {
          target: 'partial_match_for_tags',
          sort: this.auth.user.is_preminum ? 'popular_desc' : 'date_desc'
        }
      }
    },
    novelPopularPreview: {
      url: '/v1/search/popular-preview/novel',
      options: {
        target: 'partial_match_for_tags',
      }
    },
    novelBookmarkRanges: {
      url: '/v1/search/bookmark-ranges/novel',
      options: {
        target: 'partial_match_for_tags',
      }
    },
    user: {
      url: '/v1/search/user',
      then(data) {
        return data.user_previews
      }
    }
  }
}
