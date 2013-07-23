var	_
=	require('underscore')
,	Log
=	require('log-color')
,	logger
=	new Log(
		{
			level:	'debug'
		,	color:	true
		}
	)

module.exports
=	function(app)
	{
		var	defaults
		=	app.get('defaults')
		,	transforms
		=	app.get('transforms')
		,	mappings
		=	app.get('mappings')

		return	function()
				{
					var	result
					=	{
							errors: 0
						}

					_.each(
						mappings
					,	function(mapping,name)
						{
							if (_.isUndefined(mapping.fields))
								logger.warning("Falta el campo <<fields>> en el mapping "+name)
						}
					)

					_.each(
						transforms
					,	function(transform,name)
						{
							if	(!_.isEmpty(_.difference(_.keys(transform),_.union(defaults.transforms.required,defaults.transforms.optional))))
								logger.warning("Campos desconocidos <<"+_.difference(_.keys(transform),_.union(defaults.transforms.required,defaults.transforms.optional))+">> en el transform "+name)
							if	(!_.isEmpty(_.difference(defaults.transforms.required,_.keys(transform))))	{
								logger.error("Falta uno o varios campos requeridos <<"+_.difference(defaults.transforms.required,_keys(transform))+">> en el transform "+name)
								result.errors++
							}
							_.each(
								transform.associations
							,	function(assoc,assoc_name)
								{
									var assoc_defaults
									=	defaults.associations[assoc.type]

									if	(_.isUndefined(assoc_defaults))	{
										logger.error("Tipo de assoc desconocida <<"+assoc.type+">> en transform "+name+" assoc "+assoc_name)
										result.errors++
									}	else {
										if	(!_.isEmpty(_.difference(_.keys(assoc),_.union(assoc_defaults.required,assoc_defaults.optional))))
											logger.warning("Campos desconocidos <<"+_.difference(_.keys(assoc),_.union(assoc_defaults.required,assoc_defaults.optional))+">> en el transform "+name+" assoc "+assoc_name)
										if	(!_.isEmpty(_.difference(assoc_defaults.required,_.keys(assoc))))	{
											logger.error("Falta uno o varios campos requeridos <<"+_.difference(assoc_defaults.required,_.keys(assoc))+">> en el transform "+name+" assoc "+assoc_name)
											result.errors++
										}
									}
								}
							)
						}
					)

					return result
				}
	}