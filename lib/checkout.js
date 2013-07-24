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
		,	check_inheritance
		=	function(spec,spec_key)
			{
				var	inherit_assoc
				=	_.first(
						_.map(
							spec.associations
						,	function(assoc,assoc_key)
							{
								if (assoc.type == "is-a")
									return	{
												name: assoc_key
											,	target: assoc.target
											,	key: assoc.key
											}
							}
						)
					)

				if (!_.isUndefined(inherit_assoc))
				{
					var	toExtend
					=	new Object()
					_.each(
						JSON.parse(
							JSON.stringify(
								transforms[inherit_assoc.target].associations
							)
						)
					,	function(obj,name)
						{
							toExtend[name]
							=	_(obj)
									.extend(
										{
											parent: inherit_assoc.target
										,	parent_key: inherit_assoc.key
										}
									)
						}
					)
					spec.associations 
					=	_.extend(
							toExtend
						,	_.omit(
								spec.associations
							,	inherit_assoc.name
							)
						)

					check_inheritance(spec,spec_key)
				}
			}
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

					_.each(
						transforms
					,	function(spec,spec_key)
						{
							check_inheritance(spec,spec_key)
						}
					)

					return result
				}
	}