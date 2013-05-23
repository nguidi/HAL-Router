var	Factory
=	function(
		_
	,	hal
	)
	{
		hal.Collection
		=	function(collection,url)
			{
				return	new	hal
							.Resource(
								{}
							,	url
							).embed(
								'collection'
							,	collection
							)
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
