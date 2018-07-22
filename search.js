const {PixivIllust, PixivNovel, PixivUser, collect} = require('./util')

module.exports = {
  word: {
    _key: 'word',
    illust: {
      url: '/v1/search/illust',
      options() {
        return {
          target: 'partial_match_for_tags',
          sort: this.auth.user.is_preminum ? 'popular_desc' : 'date_desc'
        }
      },
      then: collect.illusts
    },
    illustPopularPreview: {
      url: '/v1/search/popular-preview/illust',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collect.illusts
    },
    illustBookmarkRanges: {
      url: '/v1/search/bookmark-ranges/illust',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collect.illusts
    },
    novel: {
      url: '/v1/search/novel',
      options() {
        return {
          target: 'partial_match_for_tags',
          sort: this.auth.user.is_preminum ? 'popular_desc' : 'date_desc'
        }
      },
      then: collect.novels
    },
    novelPopularPreview: {
      url: '/v1/search/popular-preview/novel',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collect.novels
    },
    novelBookmarkRanges: {
      url: '/v1/search/bookmark-ranges/novel',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collect.novels
    },
    user: {
      url: '/v1/search/user',
      then: collect.users
    },
    autoComplete: {
      url: '/v1/search/autocomplete',
      then: data => data.search_auto_complete_keywords
    }
  },
  user: {
    _key: 'user_id',
    detail: {
      url: '/v1/user/detail',
      then: (data, api) => new PixivUser(data, api)
    },
    illusts: {
      url: '/v1/user/illusts',
      then: collect.illusts
    },
    novels: {
      url: '/v1/user/novels',
      then: collect.novels
    },
    bookmarkIllusts: {
      url: '/v1/user/bookmarks/illust',
      options: {
        restrict: 'public'
      },
      then: collect.illusts
    },
    bookmarkIllustTags: {
      url: '/v1/user/bookmark-tags/illust',
      options: {
        restrict: 'public'
      }
    },
    bookmarkNovel: {
      url: '/v1/user/bookmarks/novel',
      options: {
        restrict: 'public'
      }
    },
    bookmarkNovelTags: {
      url: '/v1/user/bookmark-tags/novel',
      options: {
        restrict: 'public'
      }
    },
    myPixiv: {
      url: '/v1/user/mypixiv',
      then: collect.users
    },
    following: {
      url: '/v1/user/following',
      options: {
        restrict: 'public'
      },
      then: collect.users
    },
    follower: {
      url: '/v1/user/follower',
      then: collect.users
    },
    followDetail: {
      url: '/v1/user/follow/detail',
      then: data => data.follow_detail
    }
  },
  illust: {
    _key: 'illust_id',
    detail: {
      url: '/v1/illust/detail',
      then: (data, api) => new PixivIllust(data.illust, api)
    },
    bookmarkDetail: {
      url: '/v2/illust/bookmark/detail',
      then: data => data.bookmark_detail
    },
    comments: {
      url: '/v2/illust/comments',
      then: collect.comments
    },
    related: {
      url: '/v2/illust/related',
      then: collect.illusts
    },
    metadata: {
      url: '/v1/ugoira/metadata',
      then: (data) => {
        if (data.ugoira_metadata) {
          return data.ugoira_metadata
        } else {
          throw data
        }
      }
    }
  },
  novel: {
    _key: 'novel_id',
    detail: {
      url: '/v2/novel/detail',
      then: (data, api) => new PixivNovel(data.novel, api)
    },
    text: {
      url: '/v1/novel/text'
    },
    bookmarkDetail: {
      url: '/v2/novel/bookmark/detail',
      then: data => data.bookmark_detail
    },
    comments: {
      url: '/v2/novel/comments',
      then: collect.comments
    },
    related: {
      url: '/v2/novel/related',
      then: collect.novels
    },
  },
  comment: {
    _key: 'comment_id',
    replies: {
      url: '/v1/illust/comment/replies',
      then: collect.comments
    }
  },
  series: {
    _key: 'series_id',
    detail: {
      url: '/v1/novel/series',
      then: collect.novels
    }
  },
  get_users: {
    recommended: {
      url: '/v1/user/recommended',
      then: collect.users
    },
  },
  get_illusts: {
    walkthrough: {
      url: '/v1/walkthrough/illusts',
      then: collect.illusts
    },
    new: {
      url: '/v1/illust/new',
      options: {
        content_type: 'illust'
      },
      then: collect.illusts
    },
    follow: {
      url: '/v2/illust/follow',
      options: {
        restrict: 'all'
      },
      then: collect.illusts
    },
    recommended: {
      url: '/v1/illust/recommended',
      options: {
        include_ranking_illusts: true
      },
      then: collect.illusts
    },
    ranking: {
      url: '/v1/illust/ranking',
      options: {
        mode: 'day'
      },
      then: collect.illusts
    },
    myPixiv: {
      url: '/v2/illust/mypixiv',
      then: collect.illusts
    },
    trendingTags: {
      url: '/v1/trending-tags/illust',
      then: data => data.trend_tags
    }
  },
  get_mangas: {
    recommended: {
      url: '/v1/manga/recommended',
      options: {
        include_ranking_label: true
      },
      then: collect.illusts
    },
    new: {
      url: '/v1/illust/new',
      options: {
        content_type: 'manga'
      },
      then: collect.illusts
    }
  },
  get_novels: {
    new: {
      url: '/v1/novel/new',
      options: {
        content_type: 'illust'
      },
      then: collect.novels
    },
    follow: {
      url: '/v1/novel/follow',
      options: {
        restrict: 'all'
      },
      then: collect.novels
    },
    recommended: {
      url: '/v1/novel/recommended',
      options: {
        include_ranking_novels: true
      },
      then: collect.novels
    },
    ranking: {
      url: '/v1/novel/ranking',
      options: {
        mode: 'day'
      },
      then: collect.novels
    },
    myPixiv: {
      url: '/v1/novel/mypixiv',
      then: collect.novels
    },
    trendingTags: {
      url: '/v1/trending-tags/novel',
      then: data => data.trend_tags
    }
  }
}
