var	_
=	require('underscore')
	_.str
=	require('underscore.string')
,	uritemplate
=	require('./uritemplates.js').parse

function Association(name,source,assoc)
{
	this.name
	=	name

	this.target
	=	assoc.target

	this.source
	=	source

	this.type
	=	assoc.type

	this.key
	=	assoc.key
	||	'id'	//	TODO: Obtener clave principal segun el mapping

	this.target_key
	=	assoc.target_key
	||	'id'	//	TODO: Obtener Clave principal segun el mapping

	this.attrs
	=	assoc.attrs

	this.through
	=	assoc.through

	this.through_key
	=	assoc.through_key

	this.through_target_key
	=	assoc.through_target_key

	this.collection
	=	assoc.collection
	||	{
			type:	'list'
		,	page:	1
		,	ipp:	10
		}

	this.embedded
	=	assoc.embedded
	||	{
			type:	'none'
		}

	this.model_assoc_template
	=	_.isUndefined(assoc.template)
		?	uritemplate(
				'/{model_name}/:{model_key}/{model_assoc}'
			)
		:	uritemplate(
				assoc.template
			)

	this.getBody
	=	function(params,body)
		{
			return	{
						action:		this.get_action()
					,	query:		this.get_query(params,body)
					,	through:	this.get_through(params)
					}
		}

	this.get_action
	=	function()
		{
			return	_.str.include(this.type,'has-many') || _.isEqual(this.type,'has-and-belongs-to-many')
					?	'filter'
					:	'find'
		}

	this.get_query
	=	function(params,body)
		{
			return	[
						_.str.include(this.type,'through') || _.isEqual(this.type,'has-and-belongs-to-many')
						?	{}
						:	_.union(
								body.query
							,	[
									_.object(
										_.keys(params)
									,	_.values(params)
									)
								]
							)
					]
		}

	this.get_through
	=	function(params)
		{
			return	_.isDefined(this.through)
					?	{
							name:		this.through
						,	target_key:		this.target_key
						,	through_key:	this.through_key
						,	value:	data[this.key]
						,	through_target_key:	this.through_target_key
						}
					:	undefined
		}

	this.url
	=	function(data)
		{
			return	this.template
							.expand(
								{
									model_name:		this.source
								,	model_key:		data[this.source.key]
								,	model_assoc:	this.name
								}
							).replace(':','')
		}

	return	this

}

function Resource(name,transform,mapping)
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
				return	new Association(assoc_name,{name: name, key: 'id'},assoc)
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
	=	function(data)
		{
			return	_.isUndefined(data)
					?	this.model_template
								.expand(
									{
										model_name:	this.name
									}
								).replace(':','')
					:	this.model_id_template
								.expand(
									_.extend(
										{
											model_name:	this.name
										,	model_key:	data[this.key]
										}
									)
								).replace(':','')
		}

	return	this
}

module.exports = {
	'Model': Resource
}