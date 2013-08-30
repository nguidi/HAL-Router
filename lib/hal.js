var	hal
=	require('nor-hal')
,	URL
=	require('url')
,	_
=	require('underscore')

hal.Collection
=	function(collection,url,collection_query)
	{
		var	current_page
		=	collection_query.page
		||	1
		,	ipp
		=	collection_query.ipp
		||	collection.count
		,	last_page
		=	Math.ceil(collection.count/ipp)
		,	type
		=	collection_query.type

		var	resource_collection
		=	new	hal.Resource(
						{
							_rel: 	collection._rel
						,	count: 	collection.count
						}
					,	URL.resolve(url,'?page='+current_page+'&ipp='+ipp+'&type='+type)
					).embed(
						'collection'
					,	collection.data
					)

		var	links
		=	new Object()

		if	(!_.isEqual(current_page,1) && _.isEqual(type,'pageable'))
			_.extend(
				links
			,	{
					prev: 	URL.resolve(url,'?page='+(collection_query.page-1)+'&ipp='+collection_query.ipp+'&type='+collection_query.type)
				}
			)
		if	(!_.isEqual(current_page,last_page) && _.isEqual(type,'pageable'))
			_.extend(
				links
			,	{
					next: 	URL.resolve(url,'?page='+(collection_query.page+1)+'&ipp='+collection_query.ipp+'&type='+collection_query.type)
				}
			)

		if	(!_.isEqual(last_page,current_page) && _.isEqual(type,'scrollable'))
			_.extend(
				links
			,	{
					more:	URL.resolve(url,'?page='+(collection_query.page+1)+'&ipp='+collection_query.ipp+'&type='+collection_query.type)
				}
			)

		_.each(
			links
		,	function(link,rel)
			{
				resource_collection
					.link(rel,link)
			}
		)

		return resource_collection		

	}

hal.isEmpty
=	function(resource)
	{
		if	(_.isEmpty(resource))
			return true
		if	(_.isEmpty(resource._data) || _.isUndefined(resource.name))
			return true
		if	(_.isDefined(resource._data.collection) && _.isEmpty(resource._data.collection))
			return true
		return false
	}

module.exports = {
	'hal': hal
}