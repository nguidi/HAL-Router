function Resource(name,transform,mapping,curies)
{
	this.name
	=	name

	this.key
	=	'id' // Obtener Clave principal del Mapping

	this.fields
	=	mapping.fields

	this.associations
	=	_.map(
			transform.associations
		,	function(assoc,assoc_name)
			{
				return	new Association(
								assoc_name
							,	{
									name: name
								,	key: 'id'
								}
							,	assoc
							,	curies
						)
			}
		)

	this.collection
	=	transform.collection
	||	{
			type:	'list'
		,	page:	1
		,	ipp:	10
		}

	this.model_template
	=	uritemplate(
			'/{model_name}'
		)

	this.model_id_template
	=	uritemplate(
			'/{model_name}/:{model_key}'
		)

	this.url
	=	function(base_url,data)
		{
			return	_.isUndefined(data)
					?	base_url
					+	this.model_template
								.expand(
									{
										model_name:	this.name
									}
								).replace(':','')
					:	base_url
					+	this.model_id_template
								.expand(
									_.extend(
										{
											model_name:	this.name
										,	model_key:	data[this.key]
										}
									)
								).replace(':','')
		}

	this.get_fields
	=	function()
		{
			return	_.keys(this.fields)
		}

	this.get_curies
	=	function(allowed)
		{
			var	curies
			=	new Object()

			_.each(
				this.associations
			,	function(assoc)
				{
					_.extend(
						cuires
					,	assoc.get_curies(allowed[assoc.name])
					)
				}
			)

			return	curies
		}

	this.get_links
	=	function(allowed,data)
		{
			var	links
			=	new Object()

			_.each(
				this.associations
			,	function(assoc)
				{
					links[assoc.name]
					=	assoc.get_link(data)
				}
			)

			return	links
		}

	this.get_embeddeds
	=	function(data)
		{
			var	embeddeds
			=	new Object()

			_.each(
				this.associations
			,	function(assoc)
				{
					if	(_.has(data,assoc.name))
						embeddeds[assoc.name]
						=	data[assoc.name]
				}
			)

			return	embeddeds
		}

	return	this
}

module.exports = {
	'Model': Resource
}