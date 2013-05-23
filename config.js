var	Factory
=	function()
	{
		return	{
					paths: 
					{
						lib:		'./lib/'
					,	public:		'./public/'
					,	db:			'./db/'
					}
				,	server: 
					{
						name:		'Data Server'
					,	base:		'/api/data'
					,	host:		'trabajando'
					,	port:		'3003'
					,	protocol:	'http'
					,	input:
						{
							folder:		'./test/service/'
						,	mappings:	'./test/service/specs/mappings.json'
						,	transforms:	'./test/service/specs/transforms.json'
						}
					,	store:		'./db/jsonStore.js'
					}
				,	conection:
					{
						icon:	'favicon.ico'
					,	header:
						{
								'Access-Control-Allow-Origin':	'*'
							,	'Access-Control-Allow-Methods':	'POST, PUT, GET, DELETE, OPTIONS'
							,	'Access-Control-Max-Age':		'0'
							,	'Access-Control-Allow-Headers':	'X-Requested-With'
							,	'Content-Type':					'text/hal+json; charset=utf-8'
						}
					}
				,	status_codes:
					{
						'200':	'OK'
					,	'400':	'Bad Request'
					,	'401':	'Unauthorized'
					,	'403':	'Forbidden'
					,	'404':	'Not Found'
					,	'405':	'Method Not Allowed'
					,	'408':	'Request Timeout'
					,	'418':	'Im a teapot'
					,	'422':	'Unprocessable Entity'
					,	'500':	'Internal Server Error'
					,	'501':	'Not Implemented'
					,	'502':	'Bad Gateway'
					}
				}
			
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.ConfigFactory
	=	Factory
else
	module.exports
	=	Factory