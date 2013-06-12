var	Factory
=	function(
		_
	,	Store
	,	Q
	,	ACL
	)
	{
		return	function(config)
				{
					this.create
					=	function()
						{
							var deferred
							=	Q.defer()
							,	self
							=	this
							
							Q.all(
								[
									Store.list(config.acl.roles,{})
								,	Store.list(config.acl.acos,{})
								,	Store.list(config.acl.aros_acos,{})
								,	Store.list(config.acl.aros,{})
								]
							).spread(
								function(roles,acos,aros_acos,aros)
								{					
									
									self.stored
									=	{
											roles:		roles.data
										,	acos:		acos.data
										,	aros_acos:	aros_acos.data
										,	aros:		aros.data
										}
									_.each(
										roles.data
									,	function(rol)
										{
											//	Agrego Roles
											ACL.addRole(rol.profile)

											_.each(
												_.filter(
													acos.data
												,	function(aco)
													{
														return	_.isEqual(aco.id_profile,rol.id)
													}
												)
											,	function(aco)
												{
													//	Agrego Recurso
													ACL.addResource(aco.model)
													//	Permito sobre el Recurso
													ACL
														.allow(
															rol.profile
														,	aco.model
														,	_.map(
																_.filter(
																	aros_acos.data
																,	function(aros_aco)
																	{
																		return	_.isEqual(aros_aco.id_acl_acos,aco.id) && aros_aco.allow
																	}
																)
															,	function(aro_aco)
																{
																	var permission_name
																	=	_.find(
																				aros.data
																			,	function(aro)
																				{
																					return	_.isEqual(aro_aco.id_acl_aros,aro.id)
																				}
																			).permission
																	return	_.isEqual(permission_name,"all")
																			?	undefined
																			:	permission_name
																}
															)
														)
													//	Denego Sobre el Recurso
													ACL
														.deny(
															rol.profile
														,	aco.model
														,	_.map(
																_.filter(
																	aros_acos.data
																,	function(aros_aco)
																	{
																		return	_.isEqual(aros_aco.id_acl_acos,aco.id) && !aros_aco.allow
																	}
																)
															,	function(aro_aco)
																{
																	var permission_name
																	=	_.find(
																				aros.data
																			,	function(aro)
																				{
																					return	_.isEqual(aro_aco.id_acl_aros,aro.id)
																				}
																			).permission
																	return	_.isEqual(permission_name,"all")
																			?	undefined
																			:	permission_name
																}
															)
														)
												}
											)

											deferred
												.resolve(
													ACL
												)
										}
									)
								}
							)
						
							return	deferred.promise
						}

					this.find_role
					=	function(profile)
						{
							return	_.find(
										this.stored.roles
									,	function(rol)
										{
											return	_.isString(profile)
													?	_.isEqual(rol.profile,profile)
													:	_.isEqual(rol.id,profile)
										}
									)
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['hal']
	=	Factory
else
	module.exports
	=	Factory
