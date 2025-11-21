from openai import OpenAI
import traceback

client = OpenAI()

try:
    models = client.models.list()
    print("Number of models:", len(models.data))
except Exception as e:
    print("TYPE:", type(e))
    print("ERROR:", repr(e))
    print("TRACEBACK:")
    traceback.print_exc()
