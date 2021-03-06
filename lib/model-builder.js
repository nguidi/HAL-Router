var	Factory
=	function(
		_
	,	Models
	)
	{
		return	function(config,mappings,transforms)
				{
					var	Resources
					=	new Object()

					_.each(
						transforms
					,	function(transform_data,transform_name)
						{
							_.extend(
								Resources
							,	_.object(
									[_.str.capitalize(transform_name)]
								,	[
										new	Models.Resource(transform_name,transform_data,mappings[transform_data.storage.name])
									]
								)
							)
						}
					)
					
					return Resources
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelBuilder']
	=	Factory
else
	module.exports
	=	Factory
