var	Factory
=	function(
		_
	,	hal
	,	URL
	)
	{
		hal.Collection
		=	function(collection,url,collection_query)
			{
				var	current_page
				=	collection_query.page
				||	1
				,	ipp
				=	collection_query.ipp
				||	collection_query.count
				,	last_page
				=	Math.ceil(collection_query.count/ipp)
				,	type
				=	collection_query.type
				var	resource_collection
				=	new	hal
							.Resource(
								{}
							,	URL.resolve(url,'?page='+current_page+'&ipp='+ipp+'&type='+type)
							).embed(
								'collection'
							,	collection
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

		hal.Resource.Partial
		=	function(hal_resource)
			{
				var	cloned_resource
				=	new	hal
							.Resource(
								hal_resource
							)
				delete cloned_resource._data._embedded
				return cloned_resource
			}

		return	hal
	}
if(
	typeof module === 'undefined'
)
	this['hal']
	=	Factory
else
	module.exports
	=	Factory
